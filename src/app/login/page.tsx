"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        alert("Pendaftaran berhasil! Silakan cek kotak masuk email Anda untuk konfirmasi.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Berhasil login, arahkan ke aplikasi chat utama
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan yang tidak terduga.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/icon.png" alt="IPAW AI" width={48} height={48} style={{ borderRadius: '8px', marginBottom: '1rem' }} />
          <h1>Selamat Datang di IPAW AI</h1>
          <p>{isRegister ? "Buat akun baru untuk memulai" : "Masuk ke akun Anda untuk melanjutkan"}</p>
        </div>

        {errorMsg && (
          <div className="error-message">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? "Memproses..." : (isRegister ? "Daftar Akun" : "Masuk")}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <button
              type="button"
              className="toggle-auth-btn"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Masuk ke sini" : "Daftar di sini"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
