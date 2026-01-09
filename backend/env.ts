const ENV_KEYS = ["DATABASE_URL", "DATABASE_NAME", "PORT", "SECRET"] as const;
type EnvKey = (typeof ENV_KEYS)[number];

export type EnvVariables = Record<EnvKey, string>;

export class ENV {
  private static instance: ENV;

  public variables: EnvVariables;

  constructor(variables: EnvVariables) {
    this.variables = { ...variables };
  }

  public static getInstance(): ENV {
    if (!this.instance) {
      const collected = {} as EnvVariables;

      for (const key of ENV_KEYS) {
        const value = process.env[key];
        if (!value) throw new Error(`${key} variable is required!`)
        else collected[key] = value;
      }

      this.instance = new ENV(collected);
    }

    return this.instance;
  }
}