import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { apiJson } from "../services/api";

export default function UsersPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", role: "RH" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    setLoading(true);
    apiJson("/users", { token })
      .then((payload) => setUsers(payload.users || []))
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [token, user?.role]);

  if (user?.role !== "ADMIN") {
    return (
      <section className="page-stack">
        <h2>Usuários</h2>
        <p className="error-text">Somente administradores podem acessar esta página.</p>
      </section>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const payload = await apiJson("/users", {
        token,
        method: "POST",
        data: form,
      });

      setUsers((old) => [payload.user, ...old]);
      setForm({ username: "", password: "", role: "RH" });
      setMessage("Usuário criado com sucesso.");
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h2>Gestão de usuários</h2>
          <p>Perfil admin com controle total para criação de novos acessos.</p>
        </div>
      </header>

      <section className="panel">
        <form className="inline-form" onSubmit={handleSubmit}>
          <label>
            Usuário
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((old) => ({ ...old, username: e.target.value }))}
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((old) => ({ ...old, password: e.target.value }))}
              required
            />
          </label>

          <label>
            Perfil
            <select value={form.role} onChange={(e) => setForm((old) => ({ ...old, role: e.target.value }))}>
              <option value="RH">RH</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>

          <button className="primary-btn" type="submit">
            Criar usuário
          </button>
        </form>

        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}
      </section>

      <section className="panel">
        <h3>Usuários cadastrados</h3>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Perfil</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.username}</td>
                    <td>{item.role}</td>
                    <td>{new Date(item.createdAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
