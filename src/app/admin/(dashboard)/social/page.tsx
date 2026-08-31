import Link from "next/link";

import { listSocialLinks } from "./data";
import { AdminPage } from "../admin-page";
import { BulkSocialTable } from "./bulk-social-table";

export const metadata = {
  title: "Admin social links",
};

export default async function AdminSocialPage() {
  const links = await listSocialLinks();

  return (
    <AdminPage
      action={
        <Link className="admin-button" href="/admin/social/new">
          New link
        </Link>
      }
      title="Social links"
    >
      <BulkSocialTable links={links} />
    </AdminPage>
  );
}
