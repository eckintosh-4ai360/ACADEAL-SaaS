import PeriodicTableElementFinder from "../components/PeriodicTableElementFinder";

export const metadata = {
  title: "Periodic Table Element Finder | Eckintosh Study Tools",
  description: "Explore the periodic table and learn about elements and their uses.",
};

export default function PeriodicTablePage() {
  return (
    <div className="p-4 md:p-8">
      <PeriodicTableElementFinder />
    </div>
  );
}
