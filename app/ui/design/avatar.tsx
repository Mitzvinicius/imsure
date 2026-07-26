const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#db2777', '#ca8a04', '#0d9488', '#dc2626'];

export function initials(name: string) {
    const p = (name || '').trim().split(/\s+/);
    return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export function avatarColor(name: string) {
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
