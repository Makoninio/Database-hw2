async function fetchAndRender(reportName) {
  const status = document.getElementById("status");
  const table = document.getElementById("results");

  status.textContent = "Loading...";

  try {
    const res = await fetch(`/api?report=${encodeURIComponent(reportName)}`);
    const data = await res.json();

    if (!data.ok) {
      status.textContent = `Error: ${data.error}`;
      return;
    }

    const rows = data.rows;

    if (!rows || rows.length === 0) {
      status.textContent = "No results found.";
      return;
    }

    status.textContent = `Loaded ${rows.length} rows`;

    const columns = Object.keys(rows[0]);

    table.innerHTML = `
      <thead>
        <tr>
          ${columns.map(col => `<th>${col}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row =>
          `<tr>
            ${columns.map(col => `<td>${row[col] ?? ""}</td>`).join("")}
          </tr>`
        ).join("")}
      </tbody>
    `;
  } catch (err) {
    status.textContent = "Server error.";
  }
}

export { fetchAndRender };
