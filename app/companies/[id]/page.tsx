import CompanyDetail from "../../CompanyDetail";
import { companiesForPage } from "../../../lib/companyRemote";
import { problemsForPage } from "../../../lib/problemRemote";
import { playwrightCompanies, playwrightFixturesActive, playwrightProblems } from "../../../lib/playwrightFixtures";

export const metadata = { title: "oppie.lab — company record" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const [{ companies }, { problems }] = playwrightFixturesActive()
    ? [{ companies: playwrightCompanies() }, { problems: playwrightProblems() }]
    : await Promise.all([companiesForPage(), problemsForPage()]);
  return <CompanyDetail company={companies.find((company) => company.id === params.id) ?? null} problems={problems} />;
}
