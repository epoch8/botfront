import gql from 'graphql-tag';

export const MARK_READ = gql`
mutation markRead($id: String!) {
    markAsRead(id: $id){
      success
    }
}`;

export const DELETE_CONV = gql`
mutation deleteConv($id: String!) {
    delete(id: $id){
      success
    }
}`;

export const LABEL_CONV = gql`
mutation setConversationLabel($id: String!, $label: String) {
    setConversationLabel(id: $id, label: $label){
      success
    }
}`;

export const LABEL_EVENT = gql`
mutation labelEvent($id: String!, $eventIndex: Int!, $label: String) {
  labelEvent(id: $id, eventIndex: $eventIndex, label: $label){
      success
    }
}`;
