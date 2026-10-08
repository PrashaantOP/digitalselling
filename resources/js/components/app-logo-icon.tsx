import { SVGAttributes } from 'react';

/**
 * CreatorPro ka brand mark — landing ke `Logo` (home/primitives.tsx) wala hi layers icon.
 * Stroke icon hai: callers `fill-current` dete hain, isliye paths pe inline `fill: none` (class se upar).
 */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path style={{ fill: 'none' }} d="M4 7l8-4 8 4-8 4-8-4z" />
            <path style={{ fill: 'none' }} d="M4 12l8 4 8-4" />
            <path style={{ fill: 'none' }} d="M4 17l8 4 8-4" />
        </svg>
    );
}
