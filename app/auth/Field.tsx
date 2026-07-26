import { Icon, IconName } from "./icons";

export function Field({ label, icon, children }: { label: string; icon?: IconName; children: React.ReactNode }) {
    return (
        <div className="field">
            <label>{label}</label>
            <div className={"input-wrap" + (icon ? " has-ic" : "")}>
                {icon && <span className="lead-ic"><Icon name={icon} size={17} /></span>}
                {children}
            </div>
        </div>
    );
}
