import Link from "next/link";

import { listSkills } from "./data";
import {
  bucketizeSkills,
  TECH_STACK_BUCKET_ID,
  UNASSIGNED_BUCKET_ID,
  type AdminSkillBucket,
} from "./skill-buckets";
import { DeleteSkillButton } from "./delete-skill";
import { AdminPage, AdminTable } from "../admin-page";
import { otherTaxonomy } from "@/content/skills";

export const metadata = {
  title: "Admin skills",
};

function categoryLabel(id: string): string {
  return (
    otherTaxonomy.find((node) => node.key === id)?.label.en ?? id
  );
}

function BucketTable({ bucket }: { bucket: AdminSkillBucket }) {
  return (
    <section aria-labelledby={`skills-bucket-${bucket.id}`}>
      <div className="admin-bucket-head">
        <h2 id={`skills-bucket-${bucket.id}`}>{bucket.title}</h2>
        {bucket.id !== UNASSIGNED_BUCKET_ID ? (
          <Link
            className="admin-button"
            href={
              bucket.id === TECH_STACK_BUCKET_ID
                ? "/admin/skills/new?group=tech-stack"
                : `/admin/skills/new?group=others&categoryKey=${bucket.id}`
            }
          >
            Add skill
          </Link>
        ) : null}
      </div>
      {bucket.hint ? <p className="admin-hint">{bucket.hint}</p> : null}
      <AdminTable label={`${bucket.title} skills`}>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Name</th>
            <th scope="col">Category</th>
            <th scope="col">Order</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {bucket.skills.map((skill) => (
            <tr key={skill.id}>
              <td>{skill.id}</td>
              <td>
                {skill.nameEn}
                {skill.featured ? (
                  <>
                    {" "}
                    <span className="admin-badge admin-badge--success">
                      Featured
                    </span>
                  </>
                ) : null}
              </td>
              <td>
                {skill.group === "others" ? (
                  skill.categoryKey ? (
                    categoryLabel(skill.categoryKey)
                  ) : (
                    <span className="admin-badge admin-badge--warning">
                      Unassigned
                    </span>
                  )
                ) : (
                  "—"
                )}
              </td>
              <td>{skill.order}</td>
              <td className="admin-row-actions">
                <Link href={`/admin/skills/${skill.id}`}>Edit</Link>
                <DeleteSkillButton id={skill.id} name={skill.nameEn} />
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </section>
  );
}

export default async function AdminSkillsPage() {
  const { skills, error } = await listSkills();

  if (error) {
    return (
      <AdminPage title="Skills">
        <p className="admin-error" role="alert">
          {error}
        </p>
      </AdminPage>
    );
  }

  const buckets = bucketizeSkills(skills);

  return (
    <AdminPage title="Skills">
      {skills.length === 0 ? (
        <p className="admin-empty">No skills yet.</p>
      ) : (
        <div className="admin-buckets">
          {buckets.map((bucket) => (
            <BucketTable bucket={bucket} key={bucket.id} />
          ))}
        </div>
      )}
    </AdminPage>
  );
}
