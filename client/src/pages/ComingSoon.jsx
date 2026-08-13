export default function ComingSoon({ title }) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-10 text-center shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        This module is scoped in the SRS and lands in a later build phase.
      </p>
    </div>
  );
}
