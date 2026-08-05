import { redirect } from "next/navigation";

export default function RestockPage() {
  redirect("/input-data?tab=restock");
}
