'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}

/**
 * The homepage hero carousel.
 *
 * Mirrors the production site's two-slide carousel, with the manual controls
 * the original lacked. Rotation pauses on hover and on focus, and stops
 * entirely when the visitor prefers reduced motion.
 */
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    timer.current = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 7000);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, slides.length]);

  const go = (next: number) => setIndex((next + slides.length) % slides.length);

  return (
    <section
      className="relative overflow-hidden bg-brand-950"
      aria-roledescription="carousel"
      aria-label="Highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative h-[30rem] sm:h-[32rem] lg:h-[36rem]">
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              slideIndex === index ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={slideIndex !== index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${slideIndex + 1} of ${slides.length}: ${slide.title}`}
          >
            <Image
              src={slide.image}
              alt={slide.imageAlt}
              fill
              priority={slideIndex === 0}
              sizes="100vw"
              className={`object-cover transition-transform duration-[8000ms] ${
                slideIndex === index ? 'scale-105' : 'scale-100'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-950/92 via-brand-950/70 to-brand-950/25" />

            <div className="container-page relative flex h-full items-center">
              <div className="max-w-2xl py-16">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">
                  {slide.eyebrow}
                </p>
                <h1 className="mt-4 text-4xl font-black leading-[1.1] text-white sm:text-5xl lg:text-6xl">
                  {slide.title}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">
                  {slide.body}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={slide.primary.href}
                    className="rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-brand-950 transition-colors hover:bg-brand-400"
                  >
                    {slide.primary.label}
                  </Link>
                  {slide.secondary ? (
                    <Link
                      href={slide.secondary.href}
                      className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white/10"
                    >
                      {slide.secondary.label}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="container-page absolute inset-x-0 bottom-6 flex items-center justify-between">
        <div className="flex gap-2" role="tablist" aria-label="Choose slide">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={slideIndex === index}
              aria-label={slide.title}
              onClick={() => go(slideIndex)}
              className={`h-1.5 rounded-full transition-all ${
                slideIndex === index ? 'w-10 bg-brand-500' : 'w-5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
          >
            <span aria-hidden="true">←</span>
            <span className="sr-only">Previous slide</span>
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
          >
            <span aria-hidden="true">→</span>
            <span className="sr-only">Next slide</span>
          </button>
        </div>
      </div>
    </section>
  );
}
