/** Flat outlined gift box with a hanging "Pour :" tag. */
export function Gift({ tag, hidden = false, grey = false, shaking = false }: {
  tag?: string | null;
  hidden?: boolean;
  grey?: boolean;
  shaking?: boolean;
}) {
  return (
    <div className={`gift${grey ? ' grey' : ''}${shaking ? ' shaking' : ''}`} aria-hidden="true">
      <div className="bow l" />
      <div className="bow r" />
      <div className="gbox"><div className="rib" /></div>
      <div className="glid"><div className="rib" /></div>
      {tag && (
        <>
          <div className="string" />
          <div className={`gtag${hidden ? ' hidden' : ' shown'}`}>
            <div className="hole" />
            <span>Pour :</span>
            <b>{tag}</b>
          </div>
        </>
      )}
    </div>
  );
}

/** A few confetti pieces that fall once. */
export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 14 }, (_, index) => <i key={index} className={`c${index % 7}`} />)}
    </div>
  );
}
