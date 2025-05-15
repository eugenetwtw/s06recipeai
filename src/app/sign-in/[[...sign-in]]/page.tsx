export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 shadow-lg rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Sign In</h1>
        <p className="mb-4">Authentication is currently disabled.</p>
        <a href="/" className="text-blue-500 hover:underline">Return to Home</a>
      </div>
    </div>
  );
}
