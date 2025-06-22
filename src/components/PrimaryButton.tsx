export default function PrimaryButton({
    children,
    onClick,
}: {
    children: React.ReactNode;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 text-md rounded-xl shadow transition font-medium"
        >
            {children}
        </button>
    );
}
