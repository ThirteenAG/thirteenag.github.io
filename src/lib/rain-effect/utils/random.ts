export function random(
    from: number | null = null,
    to: number | null = null,
    interpolation: ((n: number) => number) | null = null
): number {
    if (from == null) {
        from = 0;
        to = 1;
    } else if (from != null && to == null) {
        to = from;
        from = 0;
    }
    const delta = (to as number) - (from as number);

    if (interpolation == null) {
        interpolation = (n: number) => {
            return n;
        }
    }
    return (from as number) + (interpolation(Math.random()) * delta);
}
export function chance(c: number): boolean {
    return random() <= c;
}