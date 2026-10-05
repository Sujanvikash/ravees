// Hand-drawn SVG Santa (viewBox 120×120, facing right, gift sack on his back, boots on y=118).
// Every moving part is its own group (.s-*) so SantaLayer can animate it; pivots are set there.
export default function SantaFigure({ mouthRef }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width="100%"
      height="100%"
      overflow="visible"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="santa-coat" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#f25a50" />
          <stop offset="0.45" stopColor="#d6282b" />
          <stop offset="1" stopColor="#9e1419" />
        </radialGradient>
        {/* Same lighting as the coat but fixed in figure space (not per-shape), so the sleeves —
            thin stroked segments whose own bounding box would skew the gradient dark — match the
            coat they sit on. It moves with each arm, so the shading stays consistent while animating. */}
        <radialGradient
          id="santa-sleeve"
          gradientUnits="userSpaceOnUse"
          cx="54"
          cy="67"
          r="57"
          gradientTransform="translate(54 67) scale(1 0.62) translate(-54 -67)"
        >
          <stop offset="0" stopColor="#f25a50" />
          <stop offset="0.45" stopColor="#d6282b" />
          <stop offset="1" stopColor="#9e1419" />
        </radialGradient>
        <linearGradient id="santa-pants" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8232a" />
          <stop offset="1" stopColor="#8a1116" />
        </linearGradient>
        <linearGradient id="santa-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9dbe0" />
        </linearGradient>
        <radialGradient id="santa-beard" cx="0.4" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#f1f1f3" />
          <stop offset="1" stopColor="#d6d8de" />
        </radialGradient>
        <radialGradient id="santa-skin" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ffe6d4" />
          <stop offset="1" stopColor="#f0bf9f" />
        </radialGradient>
        <radialGradient id="santa-nose" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffd0c6" />
          <stop offset="1" stopColor="#e88f86" />
        </radialGradient>
        <radialGradient id="santa-sack" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#b8303f" />
          <stop offset="0.55" stopColor="#7e1a28" />
          <stop offset="1" stopColor="#4c0c16" />
        </radialGradient>
        <radialGradient id="santa-mitten" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#7d4330" />
          <stop offset="1" stopColor="#3f1d14" />
        </radialGradient>
        <linearGradient id="santa-boot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#71402b" />
          <stop offset="1" stopColor="#3a1d12" />
        </linearGradient>
        {/* Roughens the edges of the white trim so it reads as fur. */}
        <filter id="santa-fuzz" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="62" cy="117" rx="30" ry="3" fill="#000" opacity="0.3" />

      <g className="s-bob">
        {/* Gift sack (behind Santa) */}
        <g className="s-sack">
          <ellipse ref={mouthRef} cx="37" cy="49" rx="19" ry="5" fill="#3a0810" />
          <g transform="rotate(-12 22 38)">
            <rect x="14" y="30" width="16" height="15" rx="2" fill="#3d82d8" />
            <rect x="20.5" y="30" width="3" height="15" fill="#f4c24f" />
            <rect x="14" y="35.5" width="16" height="3" fill="#f4c24f" />
            <ellipse cx="19.5" cy="29" rx="3" ry="1.8" fill="#f4c24f" />
            <ellipse cx="24.5" cy="29" rx="3" ry="1.8" fill="#f4c24f" />
          </g>
          <path d="M30 46 Q27 31 40 27 Q53 31 50 46Z" fill="#3aa65a" />
          <path d="M35 21 Q40 17 45 21 L42.5 26.5 L37.5 26.5Z" fill="#3aa65a" />
          <rect x="36.5" y="25.5" width="7" height="2.4" rx="1.2" fill="#d23a36" />
          <g transform="rotate(8 51 40)">
            <rect x="44" y="33" width="15" height="14" rx="2" fill="#f4a73c" />
            <rect x="50" y="33" width="3" height="14" fill="#e2582c" />
            <ellipse cx="51.5" cy="32" rx="3.4" ry="1.8" fill="#e2582c" />
          </g>
          <ellipse cx="27" cy="43" rx="8" ry="6" fill="#d3343e" />
          <path d="M24 37.5 Q27 35 30 37.5 L28.5 39.5 L25.5 39.5Z" fill="#d3343e" />
          <rect x="35" y="41" width="11" height="8" rx="1.5" fill="#2e9b50" />
          <rect x="39.3" y="41" width="2.4" height="8" fill="#f08a3c" />

          <path d="M18 51 Q8 68 11 88 Q15 107 36 108 Q57 108 61 90 Q64 70 56 51 Q37 58 18 51Z" fill="url(#santa-sack)" />
          <path d="M16 49 Q37 56 58 49 Q60 53 57 56 Q37 63 17 56 Q14 53 16 49Z" fill="#9b2234" />
          <path d="M18 58 Q37 65 56 58" fill="none" stroke="#c99a5b" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M18 58 Q37 65 56 58" fill="none" stroke="#8f6634" strokeWidth="2.6" strokeDasharray="1.2 2.2" />
          <path d="M19 59 Q11 65 14 75" fill="none" stroke="#c99a5b" strokeWidth="2.4" strokeLinecap="round" />
        </g>

        {/* Legs */}
        <g className="s-legB">
          <rect x="49" y="96" width="13" height="14" rx="5" fill="#a8181e" />
          <path d="M47 108 h14 q6 0 7 5 v2 q0 3 -3 3 h-18 q-2 0 -2 -2 v-4 q0 -4 2 -4Z" fill="#4a2618" />
        </g>
        <g className="s-legF">
          <rect x="66" y="96" width="13" height="14" rx="5" fill="url(#santa-pants)" />
          <path d="M64 108 h14 q6 0 7 5 v2 q0 3 -3 3 h-18 q-2 0 -2 -2 v-4 q0 -4 2 -4Z" fill="url(#santa-boot)" />
          <ellipse cx="73" cy="111" rx="4" ry="1.2" fill="#fff" opacity="0.15" />
        </g>

        {/* Coat */}
        <g className="s-body">
          <path d="M36 74 Q37 58 52 55 L78 55 Q93 58 94 75 Q97 88 93 96 L35 96 Q30 88 36 74Z" fill="url(#santa-coat)" />
          <path d="M55 57 Q68 63 76 74 Q83 84 82 92" fill="none" stroke="#c99a5b" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M55 57 Q68 63 76 74 Q83 84 82 92" fill="none" stroke="#8f6634" strokeWidth="2.4" strokeDasharray="1.2 2.2" />
          <g filter="url(#santa-fuzz)">
            <rect x="62.5" y="57" width="7" height="34" rx="3.5" fill="url(#santa-fur)" />
            <rect x="31" y="89" width="66" height="12" rx="6" fill="url(#santa-fur)" />
          </g>
        </g>

        {/* Head, beard and hat */}
        <g className="s-head">
          <circle cx="50.5" cy="47" r="4.5" fill="url(#santa-skin)" />
          <circle cx="66" cy="44" r="15.5" fill="url(#santa-skin)" />
          <circle cx="57.5" cy="49" r="3.6" fill="#f59a96" opacity="0.6" />
          <circle cx="76" cy="49" r="3.6" fill="#f59a96" opacity="0.6" />
          <g className="s-eyes">
            <ellipse cx="60.5" cy="43" rx="1.9" ry="2.5" fill="#2b1a12" />
            <ellipse cx="72" cy="43" rx="1.9" ry="2.5" fill="#2b1a12" />
            <circle cx="61.1" cy="42.1" r="0.6" fill="#fff" />
            <circle cx="72.6" cy="42.1" r="0.6" fill="#fff" />
          </g>
          <path d="M56.5 39.5 Q60.5 36.5 64 39" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M68.5 39 Q72.5 36.5 76 39.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />

          {/* Beard: sideburns start under the hat brim, hug the face, wrap the cheeks and meet
              under the moustache, then flow down to a tip that curls right (like the reference). */}
          <path
            d="M50.5 35 C46.5 44 45.5 56 48.5 66 C51.5 78 60 88 70 90 Q76 91 81 88 Q77 86 80 82 C86 74 88.5 58 84.5 44 L82 35 L80.5 35 C80.5 46 79 53 74.5 55.5 Q67 59.5 59.5 55.5 C55 53 53 46 53 35Z"
            fill="url(#santa-beard)"
          />
          <path d="M63 58 Q67 63.5 71 58 Q67 59.5 63 58Z" fill="#8a2f28" />
          <path
            d="M67 52.5 Q60.5 48.5 54.5 52 Q52.5 57.5 58.5 57.5 Q64 57.5 67 55 Q70 57.5 75.5 57.5 Q81.5 57.5 79.5 52 Q73.5 48.5 67 52.5Z"
            fill="#fff"
          />
          <circle cx="67" cy="50" r="4.2" fill="url(#santa-nose)" />

          <g className="s-hat">
            <path d="M51 30 Q50 11 70 8 Q89 6 97 25 Q101 35 99 44 Q95 39 93 33 Q90 29 85 30Z" fill="url(#santa-coat)" />
            <g className="s-pom">
              <circle cx="99" cy="45" r="6.2" fill="url(#santa-fur)" filter="url(#santa-fuzz)" />
            </g>
            <rect x="47" y="26" width="40" height="11" rx="5.5" fill="url(#santa-fur)" filter="url(#santa-fuzz)" />
          </g>
        </g>

        {/* Arms (in front of the beard, like the reference) */}
        <g className="s-armB">
          <path
            d="M47 59 Q34 64 35 80 Q37 88 45 86 Q45 74 52 66Z"
            fill="url(#santa-sleeve)"
            stroke="#7a0e13"
            strokeOpacity="0.5"
            strokeWidth="0.9"
          />
          <circle cx="42" cy="84" r="6.5" fill="url(#santa-fur)" filter="url(#santa-fuzz)" />
          <ellipse cx="47" cy="87" rx="6" ry="6.5" fill="url(#santa-mitten)" />
        </g>
        {/* Front arm, built from rounded segments so it looks right at any angle:
            .s-armF swings while walking, .s-armUp raises it (shoulder), .s-fore bends at the
            elbow (which points back, like a real elbow), .s-hand sets the wrist.
            Each sleeve segment has a soft darker outline drawn underneath so the arm (and the
            crease at the elbow) stands out against the same-coloured coat. */}
        <g className="s-armF">
          <g className="s-armUp">
            <path d="M86 63 L88 75" stroke="#7a0e13" strokeOpacity="0.55" strokeWidth="13.6" strokeLinecap="round" />
            <path d="M86 63 L88 75" stroke="url(#santa-sleeve)" strokeWidth="12" strokeLinecap="round" />
            <g className="s-fore">
              <path d="M88 75 L94 85" stroke="#7a0e13" strokeOpacity="0.55" strokeWidth="12.6" strokeLinecap="round" />
              <path d="M88 75 L94 85" stroke="url(#santa-sleeve)" strokeWidth="11" strokeLinecap="round" />
              <circle cx="94" cy="85" r="6.5" fill="url(#santa-fur)" filter="url(#santa-fuzz)" />
              <g className="s-hand">
                <ellipse cx="94" cy="90" rx="6" ry="6.5" fill="url(#santa-mitten)" />
                <ellipse cx="88.8" cy="88" rx="2.4" ry="3.3" transform="rotate(-30 88.8 88)" fill="url(#santa-mitten)" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
