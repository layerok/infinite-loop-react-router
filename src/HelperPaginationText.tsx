export const HelperPaginationText = ({
  count,
  page,
  pageSize,
}: {
  count: number;
  page: number;
  pageSize: number;
}) => {
  return (
    <div>
      Showing {(page - 1) * pageSize + 1}-{Math.min(count, page * pageSize)} out
      of {count} records &nbsp;
    </div>
  );
};
