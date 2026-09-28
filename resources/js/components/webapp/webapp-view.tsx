import { fontName } from '@/components/store-page/types';
import { useEffect } from 'react';
import { AuroraTheme } from './themes/aurora';
import { GridTheme } from './themes/grid';
import { PocketTheme } from './themes/pocket';
import { PressTheme } from './themes/press';
import { StudioTheme } from './themes/studio';
import { type WebappData, type WebappThemeSlug } from './types';

const THEME_COMPONENTS: Record<WebappThemeSlug, (props: { data: WebappData }) => React.ReactElement> = {
    studio: StudioTheme,
    aurora: AuroraTheme,
    grid: GridTheme,
    press: PressTheme,
    pocket: PocketTheme,
};

/** Creator ka chuna hua Google font load karo (store page bhi yahi karta hai). */
function useThemeFont(family: string | null) {
    const name = fontName(family);

    useEffect(() => {
        if (!name || name === 'Inter') return;

        const id = `webapp-font-${name.replace(/\s+/g, '-')}`;
        if (document.getElementById(id)) return;

        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.bunny.net/css?family=${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}:400,600,700`;
        document.head.appendChild(link);
    }, [name]);

    return name;
}

/**
 * Ek hi jagah se theme chunna — live webapp aur dashboard ka preview dono isi ko render karte hain,
 * isliye preview me jo dikhta hai wahi buyers ko bhi dikhta hai.
 */
export function WebappView({ data }: { data: WebappData }) {
    const Theme = THEME_COMPONENTS[data.theme] ?? StudioTheme;
    const font = useThemeFont(data.fontFamily);

    return (
        <div className="min-h-full" style={font ? { fontFamily: `"${font}", system-ui, sans-serif` } : undefined}>
            <Theme data={data} />
        </div>
    );
}
