export default function Checkbox({
  title,
  value,
  checked,
  onChange,
  style,
  disabled,
}) {
  return (
    <>
      <label
        className={`checkbox${disabled ? " disabled" : ""}`}
        style={style}
      >
        <input
          type="checkbox"
          value={value}
          checked={checked}
          onChange={onChange}
        />
        <div className="checkbox_indicator" />
        <div className="checkbox_info">
          <div className="checkbox_title">{title}</div>
        </div>
      </label>
    </>
  );
};
