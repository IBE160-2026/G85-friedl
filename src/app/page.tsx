// AD-14: siden rendres per forespørsel, aldri ferdig ved bygging. «Nå» og Søket skal ikke fryses i bygget.
export const dynamic = "force-dynamic";

export default function Forside() {
  return (
    <main>
      <h1>Turplanlegger</h1>
    </main>
  );
}
