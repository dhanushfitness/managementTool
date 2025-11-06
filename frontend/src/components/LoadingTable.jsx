import LoadingSpinner from './LoadingSpinner';

export default function LoadingTable({ colSpan = 1, message = 'Loading...' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-gray-500 text-sm">{message}</p>
        </div>
      </td>
    </tr>
  );
}

