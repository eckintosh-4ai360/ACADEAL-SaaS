import ShapeSorter from "../components/ShapeSorter";

export const metadata = {
  title: "Shape Sorter | Study Tools",
  description: "Interactive shape sorting game for KG 1-2",
};

export default function ShapeSorterPage() {
  return (
    <div className="p-4 md:p-8">
      <ShapeSorter />
    </div>
  );
}
