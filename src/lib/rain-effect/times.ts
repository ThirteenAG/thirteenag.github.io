export default function times(n: number, f: Function) {
    for (let i = 0; i < n; i++) {
        f.call(this, i);
    }
}