/* eslint-disable @next/next/no-css-tags -- the static exporter copies this route-scoped stylesheet verbatim */
export default function CredentialsLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <>
      <link rel="stylesheet" href="/credentials.css?v=20260905-learning-v1" />
      {children}
    </>
  );
}
