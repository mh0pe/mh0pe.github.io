/* eslint-disable @next/next/no-img-element -- GitHub Pages has no Next image optimizer; the checked-in poster is already optimized. */

export default function OperatingArcFilm() {
  return (
    <figure className="motion-film" aria-labelledby="motion-film-title">
      <div className="motion-film__media">
        <img
          data-motion-poster
          src="/motion/operating-arc-poster.jpg"
          alt=""
          width="1200"
          height="675"
          loading="lazy"
        />
        <video
          aria-hidden="true"
          data-motion-film
          data-autoplay
          muted
          playsInline
          preload="none"
          poster="/motion/operating-arc-poster.jpg"
          tabIndex={-1}
        >
          <source data-src="/motion/operating-arc.mp4" type="video/mp4" />
        </video>
      </div>
      <figcaption className="motion-film__caption">
        <div>
          <p className="micro-label">A system in motion</p>
          <strong id="motion-film-title">From pressure to a system teams can own.</strong>
        </div>
        <p>
          A five-second view of how pressure becomes a decision, working
          software, and a result.
        </p>
        <button className="motion-film__play" type="button" data-motion-play hidden>
          Play animation
        </button>
      </figcaption>
    </figure>
  );
}
