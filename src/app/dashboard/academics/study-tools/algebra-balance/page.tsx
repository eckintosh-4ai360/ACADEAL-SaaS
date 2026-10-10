import AlgebraBalanceScale from "../components/AlgebraBalanceScale";

export default function AlgebraBalancePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-h-screen bg-slate-50">
      <div className="mb-6">
        <a href="/dashboard/academics/study-tools" className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 transition-colors">
          &larr; Back to Study Tools
        </a>
      </div>
      <AlgebraBalanceScale />
    </div>
  );
}
