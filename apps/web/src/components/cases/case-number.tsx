/** Keep Arabic court codes in their exact place inside the displayed number. */
export function CaseNumber({ value }: { value: string }) {
  return (
    <bdi dir="ltr">
      {value.split(/([\u0621-\u064a]+)/u).map((part, index) => (
        <bdi key={index} dir={/[\u0621-\u064a]/u.test(part) ? 'rtl' : 'ltr'}>
          {part}
        </bdi>
      ))}
    </bdi>
  );
}
