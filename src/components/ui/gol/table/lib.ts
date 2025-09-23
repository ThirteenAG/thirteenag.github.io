export const flexRender = <TProps extends object>(
    comp: unknown,
    props: TProps,
) => {
    if (typeof comp === "function") {
        return comp(props);
    }
    return comp;
};