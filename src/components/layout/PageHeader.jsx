function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col items-start gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
      <div>
        <h1 className="text-heading font-semibold text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export default PageHeader
