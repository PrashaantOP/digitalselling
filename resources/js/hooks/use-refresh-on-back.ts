import { router } from '@inertiajs/react';
import { useEffect } from 'react';

/**
 * Browser back/forward pe Inertia server se data dobara nahi maangta — history me cached
 * props hi wapas render kar deta hai. Isi wajah se editor me draft/duplicate banane ke baad
 * list pe lautne par nayi row nahi dikhti thi (sirf manual page refresh pe aati thi).
 *
 * Ye hook us mount pe ek halka partial reload chalata hai jo back/forward se aaya ho.
 * Normal visit pe data pehle se fresh hota hai, isliye tab koi extra request nahi jaati.
 *
 * @param only Sirf yehi props dobara maango (e.g. ['items', 'counts']) — poora page nahi.
 */

let restoredAt = 0;

if (typeof window !== 'undefined') {
    // Inertia khud popstate sun kar component mount karta hai; hum bas yaad rakhte hain
    // ki is mount ka trigger back/forward tha.
    window.addEventListener('popstate', () => {
        restoredAt = Date.now();
    });
}

export function useRefreshOnBack(only: string[] = []) {
    // array har render pe nayi identity deta hai — string se effect stable rehta hai
    const props = only.join(',');

    useEffect(() => {
        const reload = () => router.reload(props ? { only: props.split(',') } : {});

        // popstate ke turant baad mount hua => page history se restore hua hai
        if (Date.now() - restoredAt < 2000) {
            restoredAt = 0;
            reload();
        }

        // bfcache poora document wapas laata hai — tab component unmount hi nahi hota
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) reload();
        };

        window.addEventListener('pageshow', onPageShow);
        return () => window.removeEventListener('pageshow', onPageShow);
    }, [props]);
}
