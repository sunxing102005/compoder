export const customRequire = (moduleName: string) => {
  const modules: { [key: string]: any } = {
    // base modules
    react: require("react"),
    "react-dom": require("react-dom"),
    "styled-components": require("styled-components"),
    "@capp/immotors-ui": require("@capp/immotors-ui"),
  }

  if (modules[moduleName]) {
    return modules[moduleName]
  }

  throw new Error(`Module ${moduleName} not found`)
}
