package utils

import (
	"crypto/rand"
	"encoding/base64"
)

func GenerateRandomURL() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		panic(err)
	}
	return base64.URLEncoding.EncodeToString(b)
}
