import { z } from "zod";
import { workspace } from "@/lib/workspace";
import { ImportWizard } from "@/components/import-wizard";
function resultSummary(value: unknown) {
  const result = z
    .object({ created: z.number(), updated: z.number(), skipped: z.number() })
    .safeParse(value);
  return result.success
    ? `${result.data.created} created · ${result.data.updated} updated · ${result.data.skipped} skipped`
    : "Not committed";
}
export default async function Imports() {
  const { client, org } = await workspace();
  const { data, error } = await client
    .from("import_jobs")
    .select("id,file_name,status,row_count,duplicate_count,created_at,result")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error("Import history unavailable");
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A CAREFUL START FOR YOUR DATA</p>
          <h1>Import offers</h1>
          <p className="muted">
            A real preview before anything enters your workspace.
          </p>
        </div>
      </div>
      <ImportWizard />
      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Recent import history</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Result</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((j) => (
                <tr key={j.id}>
                  <td>{j.file_name}</td>
                  <td>
                    <span className="badge">{j.status}</span>
                  </td>
                  <td>{j.row_count}</td>
                  <td>{resultSummary(j.result)}</td>
                  <td>{j.created_at.slice(0, 16).replace("T", " ")} UTC</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data?.length && (
          <p className="empty">
            No imports yet. Your first completed import will appear here.
          </p>
        )}
        <p className="subtle">
          Binary files are not stored. Staging is deleted on success; expired
          staging requires the documented privileged maintenance command.
        </p>
      </section>
    </>
  );
}
