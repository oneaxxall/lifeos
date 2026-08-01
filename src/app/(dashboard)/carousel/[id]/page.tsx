import { CarouselEditor } from "@/components/carousel/carousel-editor";

export const metadata = {
  title: "Edit Carousel — LifeOS",
  description: "Edit slide carousel: teks, ukuran, branding & download.",
};

export default async function CarouselEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CarouselEditor id={Number(id)} />;
}
