/**
 * The layout of the access portal.
 *
 * Sign-in, registration and password recovery are standalone. They carry the
 * product's own identity and nothing else — a person signing in is not
 * browsing the public site, and the public navigation would only offer them
 * somewhere they cannot go.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <main id="main" className="flex-1">{children}</main>;
}
