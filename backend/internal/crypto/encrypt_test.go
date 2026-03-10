package crypto

import (
	"strings"
	"testing"
)

func TestEncryptDecryptRoundTrip(t *testing.T) {
	key := []byte("12345678901234567890123456789012") // 32 bytes
	plaintext := "my secret token value"

	ciphertext, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}
	if ciphertext == "" {
		t.Fatal("Encrypt returned empty ciphertext")
	}
	if ciphertext == plaintext {
		t.Fatal("Encrypt returned plaintext unchanged")
	}

	decrypted, err := Decrypt(ciphertext, key)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}
	if decrypted != plaintext {
		t.Fatalf("expected %q, got %q", plaintext, decrypted)
	}
}

func TestEncryptProducesDistinctCiphertexts(t *testing.T) {
	key := []byte("12345678901234567890123456789012")
	plaintext := "same plaintext"

	c1, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatal(err)
	}
	c2, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatal(err)
	}
	// Nonces should differ, so ciphertexts must differ.
	if c1 == c2 {
		t.Fatal("expected distinct ciphertexts due to random nonce")
	}
}

func TestDecryptTamperedCiphertext(t *testing.T) {
	key := []byte("12345678901234567890123456789012")
	plaintext := "test value"

	ciphertext, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatal(err)
	}

	// Flip a character in the middle of the base64 string to simulate tampering.
	tampered := []byte(ciphertext)
	mid := len(tampered) / 2
	if tampered[mid] == 'A' {
		tampered[mid] = 'B'
	} else {
		tampered[mid] = 'A'
	}

	_, err = Decrypt(string(tampered), key)
	if err == nil {
		t.Fatal("expected error for tampered ciphertext, got nil")
	}
}

func TestDecryptWrongKey(t *testing.T) {
	key := []byte("12345678901234567890123456789012")
	wrongKey := []byte("99999999999999999999999999999999")
	plaintext := "test value"

	ciphertext, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatal(err)
	}

	_, err = Decrypt(ciphertext, wrongKey)
	if err == nil {
		t.Fatal("expected error for wrong key, got nil")
	}
}

func TestEncryptKeyLengthError(t *testing.T) {
	shortKey := []byte("tooshort")
	_, err := Encrypt("test", shortKey)
	if err == nil {
		t.Fatal("expected error for short key, got nil")
	}
	if !strings.Contains(err.Error(), "32 bytes") {
		t.Fatalf("expected error mentioning '32 bytes', got: %v", err)
	}
}

func TestDecryptKeyLengthError(t *testing.T) {
	shortKey := []byte("tooshort")
	_, err := Decrypt("someciphertext", shortKey)
	if err == nil {
		t.Fatal("expected error for short key, got nil")
	}
	if !strings.Contains(err.Error(), "32 bytes") {
		t.Fatalf("expected error mentioning '32 bytes', got: %v", err)
	}
}
