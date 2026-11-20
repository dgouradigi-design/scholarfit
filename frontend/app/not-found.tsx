import Link from "next/link";
export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <p className="font-serif text-2xl">Page introuvable</p>
      <Link href="/bourses" className="btn-primary mt-4">Voir les bourses</Link>
    </div>
  );
}
