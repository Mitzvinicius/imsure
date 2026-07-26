import contacts from "@/app/lib/placeholder_data";
import ContactsTable from "@/app/ui/contacts/table";

export default function ContactsPage() {

return (
    <ContactsTable contacts={contacts} />
)
}