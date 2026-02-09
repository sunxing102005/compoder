import { NextAuthOptions } from "next-auth"
import GitLabProvider from "next-auth/providers/gitlab"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { clientPromise } from "@/lib/db/mongo"
import { Adapter } from "next-auth/adapters"
import { env } from "@/lib/env"

export const authOptions: NextAuthOptions = {
  debug: true,
  adapter: MongoDBAdapter(clientPromise) as Adapter,
  providers: [
    GitLabProvider({
      clientId: env.GITLAB_ID,
      clientSecret: env.GITLAB_SECRET,
      allowDangerousEmailAccountLinking: true,
      issuer: "https://gitlab-ha.immotors.com",
      authorization: {
        url: "https://gitlab-ha.immotors.com/oauth/authorize",
        params: { scope: "read_user" },
      },
      token: "https://gitlab-ha.immotors.com/oauth/token",
      userinfo: "https://gitlab-ha.immotors.com/api/v4/user",
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name ?? profile.username,
          email: profile.email,
          image: profile.avatar_url,
          username: profile.username,
        }
      },
      httpOptions: {
        timeout: 30000,
      },
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session?.user) {
        session.user.id = user.id
      }
      return session
    },
  },
}
