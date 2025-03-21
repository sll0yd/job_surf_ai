'use client';

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center py-6">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-600"></div>
      <span className="ml-3 text-lg font-medium">Processing...</span>
    </div>
  );
};

export default LoadingSpinner;