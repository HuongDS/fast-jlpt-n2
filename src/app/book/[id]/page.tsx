import { BOOKS_DATA } from "@/data/books";
import { BookDetailClient } from "@/components/BookDetailClient";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return BOOKS_DATA.map((book) => ({
    id: book.id,
  }));
}

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const book = BOOKS_DATA.find((b) => b.id === params.id);
  if (!book) {
    return notFound();
  }

  return <BookDetailClient book={book} />;
}
