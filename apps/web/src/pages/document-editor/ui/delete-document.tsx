import type { Document } from '@kb/contracts';
import { useRouter } from 'next/navigation';

import type { WithId } from '@/shared/typings';
import { ConfirmDelete } from '@/shared/ui';

import { deleteDocument, documentsHref } from '@/entities/document';

export function DeleteDocument({
  id,
  title,
}: Pick<Document, 'title'> & WithId) {
  const router = useRouter();

  return (
    <ConfirmDelete
      title="Delete this document?"
      remove={async () => deleteDocument(id)}
      onRemoved={() => {
        router.push(documentsHref(null));
      }}
    >
      “{title}” and its embeddings are deleted, and the chat stops answering
      from it. This cannot be undone.
    </ConfirmDelete>
  );
}
