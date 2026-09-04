function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-heading font-semibold text-text">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  )
}

export default PageHeader
