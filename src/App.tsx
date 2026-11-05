import { lazy, Suspense, useEffect, useState } from "react";
import PublicExplorer from "./features/explorer/PublicExplorer";

const BackOffice = lazy(() => import("./features/bo/BackOffice"));

export default function App() {
  const [isBackOffice, setIsBackOffice] = useState(
    window.location.hash === "#bo",
  );

  useEffect(() => {
    const onHashChange = () => setIsBackOffice(window.location.hash === "#bo");
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
