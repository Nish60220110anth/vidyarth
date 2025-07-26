import Spinner from "./Spinner";

export default function FullscreenSpinner() {
    return (
        <div className="flex items-center justify-center h-screen w-full bg-white/50 dark:bg-black/50 backdrop-blur-sm">
            <Spinner size={40} />
        </div>
    );
}
