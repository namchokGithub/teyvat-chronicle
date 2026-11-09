import { lazy, Suspense, useEffect, useState } from "react";
import PublicExplorer from "./features/explorer/PublicExplorer";

const BackOffice = lazy(() => import("./features/bo/BackOffice"));

const isBackOfficeHash = () =>
  window.location.hash === "#bo" || window.location.hash.startsWith("#bo/");

export default function App() {
  const [isBackOffice, setIsBackOffice] = useState(isBackOfficeHash);

  useEffect(() => {
    const onHashChange = () => setIsBackOffice(isBackOfficeHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return isBackOffice ? (
    <Suspense fallback={<div className="bo-gate">Loading Back Office…</div>}>
      <BackOffice />
    </Suspense>
  ) : (
    <PublicExplorer />
  );
}
