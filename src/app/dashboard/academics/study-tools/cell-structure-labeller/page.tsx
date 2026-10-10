import CellStructureLabeller from "../components/CellStructureLabeller";

export const metadata = {
  title: "Cell Structure Labeller | Eckintosh Study Tools",
  description: "Explore and compare plant and animal cell structures.",
};

export default function CellStructureLabellerPage() {
  return (
    <div className="p-4 md:p-8">
      <CellStructureLabeller />
    </div>
  );
}
