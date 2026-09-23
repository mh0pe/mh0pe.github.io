export default function AboutPortrait() {
  return (
    <figure className="about-portrait" data-motion-once>
      <picture>
        <source
          type="image/avif"
          srcSet="/portraits/madison-outdoor-480.avif 480w, /portraits/madison-outdoor-720.avif 720w"
          sizes="(max-width: 25rem) 8.5rem, (max-width: 29.5rem) 34vw, (max-width: 48rem) 10rem, (max-width: 68rem) 18rem, 22.5rem"
        />
        <source
          type="image/webp"
          srcSet="/portraits/madison-outdoor-480.webp 480w, /portraits/madison-outdoor-720.webp 720w"
          sizes="(max-width: 25rem) 8.5rem, (max-width: 29.5rem) 34vw, (max-width: 48rem) 10rem, (max-width: 68rem) 18rem, 22.5rem"
        />
        <img
          src="/portraits/madison-outdoor-720.webp"
          width="720"
          height="960"
          sizes="(max-width: 25rem) 8.5rem, (max-width: 29.5rem) 34vw, (max-width: 48rem) 10rem, (max-width: 68rem) 18rem, 22.5rem"
          alt="Portrait of Madison Hope Steiner"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <svg className="about-portrait__trace" viewBox="0 0 320 120" aria-hidden="true" focusable="false">
        <path className="about-portrait__trace-guide" d="M-12 82C48 82 54 24 112 24s58 76 118 76 56-58 108-58" />
        <path className="about-portrait__trace-current" pathLength="1" d="M-12 82C48 82 54 24 112 24s58 76 118 76 56-58 108-58" />
        <circle cx="112" cy="24" r="6" />
        <path d="m230 92 8 8-8 8-8-8Z" />
      </svg>
    </figure>
  );
}
