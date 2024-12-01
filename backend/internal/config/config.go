package config

type Config struct {
	DatabaseURL string
	Port        string
}

func Load() *Config {
	return &Config{
		// DatabaseURL: os.Getenv("DATABASE_URL"),
		DatabaseURL: "postgresql://anmolbudhiraja:postgres@localhost/anmolbudhiraja?sslmode=disable",
		Port:        "8080",
		// Port:        os.Getenv("PORT"),
	}
}
