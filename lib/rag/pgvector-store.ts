import { env } from "@/lib/env"
import { Pool } from "pg"
import { toSql } from "pgvector"

export type PgVectorChunkInput = {
  knowledgeBaseId: string
  documentId: string
  chunkIndex?: number
  content: string
  metadata?: Record<string, any>
  embedding?: number[]
}

class PgVectorStore {
  private static pool: Pool | null = null
  private static initialized = false
  private static vectorDimension?: number

  private static getPool(): Pool {
    if (!env.PGVECTOR_CONNECTION_STRING) {
      throw new Error("PGVECTOR_CONNECTION_STRING is required when using pgvector")
    }

    if (!this.pool) {
      this.pool = new Pool({
        connectionString: env.PGVECTOR_CONNECTION_STRING,
      })
    }

    return this.pool
  }

  private static resolveDimension(dimensionHint?: number): number {
    if (this.vectorDimension) {
      return this.vectorDimension
    }

    if (dimensionHint && dimensionHint > 0) {
      this.vectorDimension = dimensionHint
      return dimensionHint
    }

    if (env.PGVECTOR_DIMENSION && env.PGVECTOR_DIMENSION > 0) {
      this.vectorDimension = env.PGVECTOR_DIMENSION
      return env.PGVECTOR_DIMENSION
    }

    this.vectorDimension = 1536
    return this.vectorDimension
  }

  private static async initTable(dimensionHint?: number) {
    if (this.initialized) {
      return
    }

    const pool = this.getPool()
    const client = await pool.connect()

    try {
      const dimension = this.resolveDimension(dimensionHint)

      await client.query("CREATE EXTENSION IF NOT EXISTS vector")
      await client.query(`
        CREATE TABLE IF NOT EXISTS document_chunks (
          id BIGSERIAL PRIMARY KEY,
          knowledge_base_id TEXT NOT NULL,
          document_id TEXT NOT NULL,
          chunk_index INTEGER,
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          embedding vector(${dimension}),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_document_chunks_knowledge_base_id
        ON document_chunks (knowledge_base_id);
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
        ON document_chunks USING ivfflat (embedding vector_l2_ops)
        WITH (lists = 100);
      `)

      this.initialized = true
    } finally {
      client.release()
    }
  }

  static async insertChunks(chunks: PgVectorChunkInput[]) {
    if (chunks.length === 0) {
      return
    }

    await this.initTable(chunks[0]?.embedding?.length)

    const pool = this.getPool()
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      for (const chunk of chunks) {
        const params = [
          chunk.knowledgeBaseId,
          chunk.documentId,
          chunk.chunkIndex ?? null,
          chunk.content,
          JSON.stringify(chunk.metadata ?? {}),
          chunk.embedding && chunk.embedding.length > 0 ? toSql(chunk.embedding) : null,
        ]

        await client.query(
          `
            INSERT INTO document_chunks (
              knowledge_base_id,
              document_id,
              chunk_index,
              content,
              metadata,
              embedding
            )
            VALUES ($1, $2, $3, $4, $5, $6);
          `,
          params
        )
      }

      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  static async search(
    knowledgeBaseId: string,
    queryEmbedding: number[],
    topK: number
  ): Promise<Array<{ content: string; similarity: number; metadata?: Record<string, any> }>> {
    await this.initTable(queryEmbedding.length)

    const pool = this.getPool()
    const { rows } = await pool.query(
      `
        SELECT content, metadata, embedding <-> $2::vector AS distance
        FROM document_chunks
        WHERE knowledge_base_id = $1 AND embedding IS NOT NULL
        ORDER BY embedding <-> $2::vector
        LIMIT $3;
      `,
      [knowledgeBaseId, toSql(queryEmbedding), topK]
    )

    return rows.map(row => ({
      content: row.content as string,
      metadata: row.metadata ?? {},
      similarity:
        row.distance !== null && row.distance !== undefined
          ? 1 / (1 + Number(row.distance))
          : 0,
    }))
  }

  static async fetchRecentChunks(
    knowledgeBaseId: string,
    limit: number
  ): Promise<Array<{ content: string; metadata?: Record<string, any> }>> {
    await this.initTable()

    const pool = this.getPool()
    const { rows } = await pool.query(
      `
        SELECT content, metadata
        FROM document_chunks
        WHERE knowledge_base_id = $1
        ORDER BY created_at DESC
        LIMIT $2;
      `,
      [knowledgeBaseId, limit]
    )

    return rows.map(row => ({
      content: row.content as string,
      metadata: row.metadata ?? {},
    }))
  }

  static async deleteByDocument(documentId: string) {
    await this.initTable()
    const pool = this.getPool()
    await pool.query(`DELETE FROM document_chunks WHERE document_id = $1;`, [documentId])
  }

  static async deleteByKnowledgeBase(knowledgeBaseId: string) {
    await this.initTable()
    const pool = this.getPool()
    await pool.query(`DELETE FROM document_chunks WHERE knowledge_base_id = $1;`, [
      knowledgeBaseId,
    ])
  }
}

export { PgVectorStore }
