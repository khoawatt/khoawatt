/** Render a JSON-LD `<script>` safely inside a server component. */
export function JsonLdScript({ data }: Readonly<{ data: string }>) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: data }}
      type="application/ld+json"
    />
  );
}